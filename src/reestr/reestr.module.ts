import { BullModule } from '@nestjs/bull';
import { HttpException, HttpStatus, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ReestrConsumer } from './reestr.consumer';
import { ReestrController } from './reestr.controller';
import { ReestrService } from './reestr.service';
import { editFileName } from './utils';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './files/reestrs',
        filename: editFileName,
      }),
      fileFilter: (req, file, callback) => {
        const supportedMimeTypes = [
          'text/csv',
          'application/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
          'application/vnd.ms-excel',
          'application/vnd.ms-excel.sheet.macroEnabled.12',
          'application/vnd.ms-excel',
        ];
        //const regexp = /\.$(csv|csv1|xlsx|xlsb|xls|xlsm)/;
        console.log(file.mimetype, supportedMimeTypes.includes(file.mimetype));
        if (supportedMimeTypes.includes(file.mimetype)) {
          return callback(null, true);
        }
        callback(
          new HttpException('Unsupported File', HttpStatus.BAD_REQUEST),
          false,
        );
      },
    }),
    BullModule.registerQueue({
      name: 'reestr',
    }),
  ],
  controllers: [ReestrController],
  providers: [ReestrService, ReestrConsumer],
})
export class ReestrModule {}
