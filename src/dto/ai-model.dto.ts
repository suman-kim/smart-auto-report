export interface AiModel {
  modelName: string; // 모델이름
  developer: string; // 개발사
  releaseDate: string; // 출시일 (YYYY-MM-DD 형식)
  modelType: string[]; // 모델 유형 (예: 텍스트 생성, 이미지 생성 등)
  parameters: string; // 파라미터 수 (예: "1억", "10억" 등)
  keyFeatures: string; // 주요 특징 (예: ["고속 처리", "다국어 지원"])
  useCases: string[]; // 사용 사례 (예: ["챗봇", "이미지 생성"])
  modelUrl: string; // 모델 URL (바로 접속 가능해야 함)
  imageUrl?: string; // 이미지 URL (모델 관련 대표 이미지 URL 등, 선택 사항)
  performanceRating: number; // 성능 평가 (예: "우수", "양호", "보통")
  accessibility: string[]; // 접근성 (예: "API 지원", "사용하기 쉬움")
  memo?: string; // 추가 메모 (선택 사항)
  pricing: string; // 가격 정보 (예: "무료", "유료", "구독형")
  freePlan: string; // 무료 플랜 여부 (true/false)
}

export interface CrawlingResult {
  models: AiModel[];
  summary: string;
  totalFound: number;
  crawledAt: Date;
}