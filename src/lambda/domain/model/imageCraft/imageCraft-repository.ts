export interface CreateImageProc {
  orderedText: string;
  quoteToken: string;
}

export interface ImageCraftRepository {
  createImage(param: CreateImageProc): Promise<void>;
  getImageUrl(quoteToken: string): Promise<string>;
}
