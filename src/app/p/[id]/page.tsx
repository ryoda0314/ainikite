import { SharedProjectView } from "./shared-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SharedPage({ params }: PageProps) {
  const { id } = await params;
  return <SharedProjectView id={id} />;
}
