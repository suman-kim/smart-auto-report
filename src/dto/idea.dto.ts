export interface IdeaDto {
  content?: string; //text //폰에서 받는 아이디어 내용
  location?: string; //text //폰에서 받는 아이디어 위치
  status?: string; //text
  keywords?: string[]; //text[]
  createdAt?: string; //text //아이디어 생성일
  source?: 'text' | 'voice'; //구분하기 위함
}
