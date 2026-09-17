import { useEffect } from 'react'
import AIRelationAnalysis from './components/AIRelationAnalysis'
import CustomerRelationGraph from './components/CustomerRelationGraph'
import AICustomerInsight from './components/AICustomerInsight'
import InteractionTimeline from './components/InteractionTimeline'
import AISummary from './components/AISummary'
import BusinessProgress from './components/BusinessProgress'
import { dashboardBus } from './bus'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const Dashboard = () => {
  // 屏幕宽度自适应布局：
  // 宽屏 (>1860px)：三列两行，保持原有布局
  // 中屏 (1300~1860px)：两列三行
  // 窄屏 (<1300px)：两列四行，图谱与商机进展独占整行
  const isWide = useMediaQuery('(min-width: 1861px)')
  const isNarrow = useMediaQuery('(max-width: 1299px)')

  useEffect(() => {
    return () => {
      // 布局模式变化或离开页面时清空总线去重缓存。
      // 布局切换会整树替换条件分支，面板重新挂载后图谱会再次发出 customer:selected 等事件；
      // 若不重置缓存，去重逻辑会将其误判为重复而丢弃，导致其它面板收不到事件而空白。
      dashboardBus.emit('clear')
    }
  }, [isWide, isNarrow])

  // 面板滚动区最大高度，由父组件统一控制（可按布局分别调整）
  const bodyMaxHeight = '677px'

  return (
    <div className="flex flex-1 p-4 overflow-auto">
      {isWide ? (
        <div className="flex-1 h-fit min-h-full grid gap-4 grid-cols-[1fr_2fr_1fr] grid-rows-[minmax(570px,1fr)_460px]">
          <AIRelationAnalysis bodyMaxHeight={bodyMaxHeight} />
          <CustomerRelationGraph />
          <AICustomerInsight bodyMaxHeight={bodyMaxHeight} />
          <div className="grid gap-4 col-start-1 col-span-3 grid-cols-[1.2fr_1.1fr_1.2fr]">
            <InteractionTimeline />
            <AISummary />
            <BusinessProgress />
          </div>
        </div>
      ) : isNarrow ? (
        <div className="flex-1 h-fit min-h-full grid gap-4 grid-cols-2 grid-rows-[minmax(570px,1fr)_667px_667px_460px]">
          <div className="col-span-2 flex">
            <CustomerRelationGraph />
          </div>
          <AIRelationAnalysis />
          <AICustomerInsight />
          <InteractionTimeline />
          <AISummary />
          <div className="col-span-2 flex">
            <BusinessProgress />
          </div>
        </div>
      ) : (
        <div className="flex-1 h-fit min-h-full grid gap-4 grid-rows-[minmax(570px,1fr)_667px_460px]">
          <div className="grid gap-4 grid-cols-[2fr_1fr]">
            <CustomerRelationGraph />
            <AIRelationAnalysis />
          </div>
          <div className="grid gap-4 grid-cols-2">
            <AICustomerInsight />
            <InteractionTimeline />
          </div>
          <div className="grid gap-4 grid-cols-2">
            <AISummary />
            <BusinessProgress />
          </div>
        </div>
      )}
    </div>
  )
}
export default Dashboard
