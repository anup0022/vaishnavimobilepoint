import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search, SmartphoneNfc } from 'lucide-react'
import Magnetic from '@/components/Magnetic'

export default function NotFound() {
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center px-4 py-24">

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative text-center"
      >
        <motion.div
          animate={{ rotate: [0, -8, 8, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-brand-600/20 text-brand-700"
        >
          <SmartphoneNfc size={44} />
        </motion.div>

        <h1 className="font-display text-7xl font-extrabold sm:text-8xl">
          <span className="text-brand-600">404</span>
        </h1>
        <h2 className="mt-4 font-display text-2xl font-bold">No signal on this page</h2>
        <p className="mx-auto mt-4 max-w-sm text-mist-400">
          The page you were after has moved or never existed. Let's get you back to something useful.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Magnetic>
            <Link to="/" className="btn-primary">
              <Home size={18} /> Back home
            </Link>
          </Magnetic>
          <Link to="/products" className="btn-ghost">
            <Search size={18} /> Browse the shop
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
