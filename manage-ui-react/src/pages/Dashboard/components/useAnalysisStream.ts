import { useCallback, useEffect, useRef, useState } from 'react'
import { dashboardBus } from '@/pages/Dashboard/bus'
import { analysisResultApi } from '../mock/api'
import type { AnalysisEvent, CachedAnalysisType } from '../mock/types'

interface UseAnalysisStreamOptions {
  /** 选中客户后缓存未命中时，是否自动发起分析（关系分析为手动按钮触发，设为 false） */
  autoRun?: boolean
}

/**
 * Dashboard AI 分析面板共享的流式分析 hook。
 *
 * 两条触发路径：
 * - 选中客户（dashboardBus customer:selected）：先 GET /customers/:id/analysis-result
 *   取缓存与数据库。命中且未过期 -> 直接展示，不再分析；未命中 -> 仅当 autoRun=true
 *   时自动发起 SSE（客户洞察 / 智能总结），autoRun=false（关系分析）则等待手动按钮。
 * - 手动按钮 run()：强制重新分析，始终发起 SSE 流，忽略缓存。
 *
 * 切换客户 / 卸载时取消进行中的流，避免上一客户的分析残留或卡在 loading。
 */
export function useAnalysisStream<T>(
  streamFn: (
    customerId: string,
    onEvent: (ev: AnalysisEvent<T>) => void,
    onDone: () => void,
    onError?: (msg: string) => void,
  ) => AbortController,
  options: UseAnalysisStreamOptions & { cacheType: CachedAnalysisType } = {
    autoRun: false,
    cacheType: 'customer_insight',
  },
) {
  const { autoRun = false, cacheType } = options
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(
    null,
  )
  const [data, setData] = useState<T | null>(null)
  /** 分析结果生成时间：缓存命中取服务端 generatedAt，实时分析取落地时刻 */
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [thinking, setThinking] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const customerIdRef = useRef<string | null>(null)

  /** 取缓存：命中且未过期则先展示，返回是否命中（读失败视为未命中） */
  const prefillFromCache = useCallback(
    async (cid: string): Promise<boolean> => {
      try {
        const cached = await analysisResultApi.get<T>(cid, cacheType)
        // 异步期间可能已切换客户，丢弃过期结果
        if (customerIdRef.current !== cid) return false
        if (cached?.result) {
          setData(cached.result as T)
          setGeneratedAt(cached.generatedAt)
          return true
        }
      } catch {
        // 缓存读失败不影响主流程
      }
      return false
    },
    [cacheType],
  )

  /** 启动 SSE 流式分析（不读缓存），data 事件落地覆盖状态 */
  const startStream = useCallback(() => {
    const cid = customerIdRef.current
    if (!cid) return
    abortRef.current?.abort()
    setError(null)
    setLoading(true)
    let md = '## 正在分析……\n'
    let section: 'thinking' | 'result' | null = null
    setThinking(md)

    abortRef.current = streamFn(
      cid,
      (ev) => {
        if (ev.type === 'step') {
          section = null
          md += `\n## ${ev.title}\n${ev.body}\n`
          setThinking(md)
        } else if (ev.type === 'thinking') {
          if (section !== 'thinking') {
            md += '\n### 思考\n'
            section = 'thinking'
          }
          md += ev.delta
          setThinking(md)
        } else if (ev.type === 'result') {
          if (section !== 'result') {
            md += '\n### 结果\n'
            section = 'result'
          }
          md += ev.delta
          setThinking(md)
        } else if (ev.type === 'data') {
          setData(ev.data)
          setGeneratedAt(new Date().toISOString())
        } else if (ev.type === 'error') {
          setError(ev.message)
        }
      },
      () => {
        setThinking('')
        setLoading(false)
      },
      (msg) => {
        setError(msg)
        setThinking('')
        setLoading(false)
      },
    )
  }, [streamFn])

  /** 手动按钮：强制重新分析（始终发起 SSE，忽略缓存） */
  const run = useCallback(() => {
    const cid = customerIdRef.current
    if (!cid) return
    setData(null)
    setError(null)
    setGeneratedAt(null)
    startStream()
  }, [startStream])

  useEffect(() => {
    const onCustomer = (c: { id: string; name: string }) => {
      setCustomer(c)
      customerIdRef.current = c.id
      setData(null)
      setError(null)
      setGeneratedAt(null)
      // 取消进行中的流并重置过渡态（避免上一客户的分析残留 / 卡在 loading）
      abortRef.current?.abort()
      setThinking('')
      setLoading(false)

      // 先取缓存与数据库：命中即展示，不再分析
      prefillFromCache(c.id).then((hit) => {
        if (customerIdRef.current !== c.id) return
        if (hit) return // 命中缓存，无需分析
        // 未命中：autoRun 才自动分析，否则等待手动按钮（关系分析）
        if (autoRun) startStream()
      })
    }
    dashboardBus.on('customer:selected', onCustomer)
    return () => {
      dashboardBus.off('customer:selected', onCustomer)
      abortRef.current?.abort()
    }
  }, [autoRun, prefillFromCache, startStream])

  return { customer, data, generatedAt, thinking, error, loading, run }
}
