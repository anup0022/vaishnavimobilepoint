import { BrowserRouter, Routes, Route, useLocation, useSearchParams } from 'react-router-dom'
import Switcher from './shell/Switcher'
import Compare from './shell/Compare'
import Counter from './concepts/Counter'
import Bench from './concepts/Bench'
import Dukaan from './concepts/Dukaan'

/**
 * Mobile layouts are shown in a real 390px iframe rather than a scaled-down
 * desktop render, so media queries, touch targets and `hover: none` all
 * behave the way they would on a handset.
 */
function DeviceFrame({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [params] = useSearchParams()
  const bare = params.get('bare') === '1'
  const mobile = params.get('device') === 'mobile'

  if (bare || !mobile) return <>{children}</>

  return (
    <div className="min-h-screen bg-[#0d1016] px-4 py-10 pb-24">
      <div className="mx-auto w-[390px] max-w-full">
        <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
          390 × 844
        </div>
        <div className="overflow-hidden rounded-[2.2rem] border-[10px] border-[#23283a] bg-black shadow-2xl">
          <iframe
            key={location.pathname}
            title="Mobile preview"
            src={`${location.pathname}?bare=1`}
            className="block h-[844px] w-[390px] border-0 bg-white"
          />
        </div>
      </div>
    </div>
  )
}

function Routed() {
  const [params] = useSearchParams()
  const bare = params.get('bare') === '1'

  return (
    <>
      <DeviceFrame>
        <Routes>
          <Route path="/" element={<Compare />} />
          <Route path="/counter" element={<Counter />} />
          <Route path="/bench" element={<Bench />} />
          <Route path="/dukaan" element={<Dukaan />} />
        </Routes>
      </DeviceFrame>
      {!bare && <Switcher />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routed />
    </BrowserRouter>
  )
}
