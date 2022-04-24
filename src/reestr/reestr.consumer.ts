import { join } from 'path';
import { readFile, utils, writeFile } from 'xlsx';
import { InitialSheet, NewSheet } from './reestr.types';
import { OnQueueActive, OnQueueError, Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import axios from 'axios';

type SuipApiResponse = {
  result: boolean;
  requisite: string;
  amount: number;
  created?: string | null;
  suip?: string | null;
}

@Processor('reestr')
export class ReestrConsumer {
  @OnQueueActive()
  onActive(job: Job) {
    console.log(`Processing job ${job.id} of type ${job.name} with data ${job.data}...`,)
  }

  @OnQueueError()
  onError(error) {
    console.log("Queue error...", error);
  }

  async requestToSuip(suip: string) {
    const exampleData = {
      result: false,
      requisite: "",
      amount: 0,
      created: null,
      suip: null
    };
    try {
      const { data } = await axios.get<SuipApiResponse | null | undefined>(process.env.TEST_MODE ? process.env.TEST_SUIP_API_URL : `${process.env.SUIP_API_URL}${suip}`);
      return data || exampleData;
    } catch (error) {
      console.error("Error: requestToSuip()", error);
      return exampleData;
    }
  }

  async getSuipInfo(sheet: [InitialSheet, InitialSheet, InitialSheet, InitialSheet]): Promise<NewSheet> {
    // const OPERDAY = sheet[0].act_type!;
    const SUIP = sheet[1].act_type!;
    const STATE = sheet[2].act_type!;
    const NOM_OPER = sheet[3].act_type!;

    const suipResult = await this.requestToSuip(SUIP);

    return {
      OPERDAY: suipResult.created,
      SUIP,
      STATE,
      NOM_OPER,
      Requisite: suipResult.requisite,
      SUM: suipResult.amount.toString(),
    };
  }

  async* generate(data: InitialSheet[]): AsyncGenerator<[NewSheet, number]> {
    for (let i = 0; i < data.length; i += 4) {
      const subList = data.slice(i, i + 4) as [InitialSheet, InitialSheet, InitialSheet, InitialSheet];
      const result = await this.getSuipInfo(subList);
      yield [result, i];
    }
  }

  async formatData(data: InitialSheet[], job: Job<Express.Multer.File>) {
    const newData: NewSheet[] = [];
    for await (const [result, index] of this.generate(data)) {
      job.progress(Math.floor((index / data.length * 100) / 120 * 100));
      newData.push(result);
    }
    return newData;
  }

  @Process()
  async formatFile(job: Job<Express.Multer.File>) {
    console.log("Starting process...", { job })
    //let progress = 0;
    //progress+=10;
    //job.progress(progress);
    //console.log({job, progress})
    const file = job.data;
    const f = readFile(join(file.path));
    const sheetNames = f.SheetNames;
    const data: InitialSheet[] = sheetNames.map((sheetName) => {
      const temp: InitialSheet[] = utils.sheet_to_json(
        f.Sheets[sheetName],
      )
      return temp;
    }).flat();

    const filteredData = data.filter((_, i) => i != 0 && (i + 4) % 5);
    const newData: NewSheet[] = await this.formatData(filteredData, job);

    const newWorkBook = utils.book_new();
    const newSheet = utils.json_to_sheet(newData, { header: ['OPERDAY', 'SUIP', 'STATE', 'NOM_OPER', 'Requisite', 'SUM'] })
    utils.book_append_sheet(newWorkBook, newSheet, `Реестр данных на ${new Date(data[0].operDay).toLocaleDateString()}`);

    writeFile(newWorkBook, `files/new/${file.filename}`);
    job.progress(100);
    return {
      originalname: file.originalname,
      filename: file.filename,
      newFilePath: `new/${file.filename}`,
      sheetNames,
      newData,
      data,
    };
  }
}