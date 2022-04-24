import {
  Controller,
  MessageEvent,
  Param,
  Post,
  Sse,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Observable, Observer } from 'rxjs';
import { ReestrService } from './reestr.service';

@Controller('reestr')
export class ReestrController {

  constructor(
    private readonly reestrService: ReestrService,
  ){}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    //return this.reestrService.uploadFile(file);
    return this.reestrService.uploadFile(file);
  }

  @Sse('status/:jobId')
  fileStatus(
    @Param('jobId') jobId: string
  ): Observable<MessageEvent> {
    return this.reestrService.fileStatus(jobId);
  }
}
