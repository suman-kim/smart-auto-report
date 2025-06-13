export class MailAttachmentDTO {
  filename:string;
  path:string;
  contentType:string;

  constructor(filename:string, path:string, contentType:string) {
    this.filename = filename;
    this.path = path;
    this.contentType = contentType;
  }
}