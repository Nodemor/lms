import { Film, PlayCircle } from 'lucide-react';
import clsx from 'clsx';

/** Lesson thumbnail: YouTube's own image for YouTube lessons, a neutral tile for uploads. */
export default function LessonThumb({ lesson, className }) {
  return (
    <div className={clsx('relative shrink-0 overflow-hidden rounded-xl bg-ink', className || 'aspect-video w-36')}>
      {lesson.thumbnailUrl
        ? <img src={lesson.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        : <div className="grid h-full w-full place-items-center"><Film className="h-6 w-6 text-violet-300" /></div>}
      <PlayCircle className="absolute bottom-1.5 right-1.5 h-5 w-5 text-white drop-shadow" aria-hidden="true" />
    </div>
  );
}
