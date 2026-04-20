import IELTSPageClient from '@/components/ielts/IELTSPageClient';
import PageShell from '@/components/PageShell';
import { getIELTSArticleList } from '@/lib/ielts';

export default async function IELTSPage() {
  const articles = await getIELTSArticleList();

  return (
    <PageShell>
      <IELTSPageClient articles={articles} />
    </PageShell>
  );
}
