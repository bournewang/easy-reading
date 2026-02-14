export interface Resource {
  name: string;
  icon_url: string;
  url: string;
}

export interface ReadingResources {
  news: Resource[];
  novels: Resource[];
  literature: Resource[];
  educational_articles: Resource[];
  magazines: Resource[];
  science: Resource[];
  technology: Resource[];
}