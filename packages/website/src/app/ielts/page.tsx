import IELTSPageClient from '@/components/ielts/IELTSPageClient';
import { getIELTSArticleList } from '@/lib/ielts';

export default async function IELTSPage() {
  const articles = await getIELTSArticleList();

  return <IELTSPageClient articles={articles} />;
}
