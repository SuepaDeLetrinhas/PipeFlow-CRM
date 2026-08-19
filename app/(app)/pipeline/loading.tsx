import { PageHeaderSkeleton } from "@/components/layout/loading-skeleton";
import { PipelineBoardSkeleton } from "@/components/pipeline/pipeline-board-skeleton";

export default function PipelineLoading() {
  return (
    <>
      <PageHeaderSkeleton withAction />
      <PipelineBoardSkeleton />
    </>
  );
}
