import { Injectable, MessageEvent } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { JobId, Queue } from 'bull';
import { Observable } from 'rxjs';
import * as shortid from 'shortid';
import { readFile, utils, writeFile } from 'xlsx';
import { InitialSheet, NewSheet } from './reestr.types';
import { join } from 'path';

@Injectable()
export class ReestrService {
  constructor(
    @InjectQueue('reestr') private reestrQueue: Queue<Express.Multer.File>,
  ){}

  async uploadFileForce(file: Express.Multer.File){
    const f = readFile(join(file.path));
    const sheetNames = f.SheetNames;
    const data: InitialSheet[] = sheetNames.map((sheetName)=>{
      const temp: InitialSheet[] = utils.sheet_to_json(
        f.Sheets[sheetName],
      )
      return temp;
    }).flat();

    const filteredData = data.filter((_, i) => i != 0 && (i+4)%5);
    const newData: NewSheet[] = [];
    for(let i = 0; i< filteredData.length; i+=4){
      const OPERDAY = filteredData[i].act_type!;
      const SUIP = filteredData[i+1].act_type!;
      const STATE = filteredData[i+2].act_type!;
      const NOM_OPER = filteredData[i+3].act_type!;
      newData.push({
        OPERDAY,
        SUIP,
        STATE,
        NOM_OPER,
      })
    }
    const newWorkBook = utils.book_new();
    const newSheet = utils.json_to_sheet(newData, {header: ['OPERDAY', 'SUIP', 'STATE', 'NOM_OPER', 'Requisite', 'SUM']})
    utils.book_append_sheet(newWorkBook, newSheet, `Реестр данных на ${new Date(data[0].operDay).toLocaleDateString()}`);

    writeFile(newWorkBook, `files/new/${file.filename}`);
    
    return {
      originalname: file.originalname,
      filename: file.filename,
      newFilePath: `/new/${file.filename}`,
      sheetNames,
      //newData,
      //data,
    };
  }

  async uploadFile(file: Express.Multer.File): Promise<{jobId: JobId}> {
    console.log('Uploading File...', file);
    const jobId = shortid.generate();
    //const jobId = 'TEST';
    console.log(await this.reestrQueue.getJobCounts())
    this.reestrQueue.add(file,{ jobId });
    return {jobId};
  }

  fileStatus(jobId: JobId): Observable<MessageEvent>{
    return new Observable((subscriber) => {
      const intervalId = setInterval(async ()=>{
        const job = await this.reestrQueue.getJob(jobId);
        if(!job){
          clearInterval(intervalId)
          subscriber.next({
            data: {
              completed: false,
              failed: true,
            }
          })
          subscriber.unsubscribe();
          return;
        }
        const progress = await job.progress();
        const isCompleted = await job.isCompleted();
        const isFailed = await job.isFailed();
        console.log("Observe...", {jobId, job, progress, isCompleted, isFailed});
        if(isCompleted){
          clearInterval(intervalId)
          subscriber.next({
            data: {
              completed: true,
              progress,
              failed: false,
              data: job.data,
              data2: await job.finished(),
            }
          })
          subscriber.unsubscribe();
        }else if(isFailed){
          clearInterval(intervalId)
          subscriber.next({
            data: {
              completed: false,
              progress,
              failed: true,
            }
          })
          subscriber.unsubscribe();
        }else{
          subscriber.next({
            data: {
              completed: false,
              progress,
              failed: false,
            }
          })
        }
      }, 500);
    })
  }
}
