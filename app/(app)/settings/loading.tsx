import {
  PageHeaderSkeleton,
  SectionSkeleton,
} from "@/components/layout/loading-skeleton";

/**
 * `/settings` espera seis queries em paralelo (workspace, usuário, papel,
 * membros, plano e assinatura), e mais duas quando quem abre é admin.
 */
export default function SettingsLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="space-y-8">
        <SectionSkeleton rows={3} />
        <SectionSkeleton rows={2} />
        <SectionSkeleton rows={1} />
      </div>
    </>
  );
}
