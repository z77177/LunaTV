import VideoParser from '@/components/VideoParser';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '解析 - BrooklynTV Enhanced',
  description: '多平台视频解析工具，支持腾讯视频、爱奇艺、优酷、B站等主流平台',
};

export default function ParsePage() {
  return <VideoParser />;
}
