import { Link } from 'react-router-dom'
import { shopPhoto } from '@/lib/images'

interface Props {
  image: string
  alt: string
  title: string
  text: string
  cta: string
  to: string
}

/** A full-width photograph with a white card centred on it. */
export default function PromoBanner({ image, alt, title, text, cta, to }: Props) {
  const set = shopPhoto(image)
  return (
    <section className="relative flex min-h-[645px] items-center justify-center overflow-hidden px-5 py-[60px] lg:min-h-[681px]">
      {/* On a phone the 645px-tall band crops a 4:3 photo to ~860px wide. */}
      <img
        src={set.src}
        srcSet={set.srcSet}
        sizes="(max-width: 639px) 860px, 100vw"
        alt={alt}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="relative w-full max-w-[740px] bg-white p-[30px] text-center min-[420px]:p-[50px]">
        <h2 className="text-[30px] font-medium uppercase leading-[1.3] text-black md:text-[46px] lg:text-[60px]">{title}</h2>
        <p className="mt-[22px] text-[18px] leading-[1.8] sm:text-[20px]">{text}</p>
        <Link to={to} className="st-btn mt-10">{cta}</Link>
      </div>
    </section>
  )
}
