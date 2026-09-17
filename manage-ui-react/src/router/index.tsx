import { createBrowserRouter } from 'react-router'
import { routeObjects } from './routes.tsx'

/**
 * React Router Data Mode：在 React 树外创建 router 实例（只创建一次）。
 * 配合 main.tsx 里的 <RouterProvider router={router} /> 使用。
 */
export const router = createBrowserRouter(routeObjects)
