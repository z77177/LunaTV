import VideoParser from '@/components/VideoParser';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '解析 - LunaTV Enhanced',
  description: '多平台视频解析工具，支持腾讯视频、爱奇艺、优酷、B站、芒果TV、搜狐视频等主流平台',
  keywords: ['视频解析', '在线解析', '腾讯视频', '爱奇艺', '优酷', 'B站'],
};

export default function ParsePage() {
  return (
    <div className="container mx-auto px-0 md:px-4 py-4 md:py-6 max-w-7xl min-h-screen">
      <VideoParser />
    </div>
  );
}
