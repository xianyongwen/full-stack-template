import { useEffect, useRef, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cname } from '@/utils'
import Styles from './index.module.scss'

interface ContainerProps {
  loading?: boolean
  text?: string
  thinking?: string
  className?: string
  children?: ReactNode
}

const Container = ({
  loading = false,
  text = 'Loading...',
  thinking = '',
  className = '',
  children,
}: ContainerProps) => {
  const thinkContentRef = useRef<HTMLDivElement>(null)

  // thinking 变化时，overlay 自动滚动到底部（流式输出场景）
  useEffect(() => {
    const el = thinkContentRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [thinking])

  return (
    <div
      className={cname(Styles.container, (loading || thinking) && Styles.loading, className)}
    >
      {(loading || thinking) && (
        <>
          <div className={cname(Styles.overlay, thinking && Styles.thinking)}>
            {thinking ? (
              <div ref={thinkContentRef} className="flex-1 overflow-y-auto scrollbar-hidden">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{thinking}</ReactMarkdown>
              </div>
            ) : null}
          </div>
          <div className={Styles.scan}></div>
          {loading && <div className={Styles.center}>
            <div className={Styles.core}>
              <div className={Styles.dot}></div>
            </div>
            {text && <div className={Styles.text}>{text}</div>}
          </div>}
        </>
      )}
      {children}
    </div>
  )
}
export default Container
