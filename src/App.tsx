import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireRole } from './components/RequireRole'
import { SiteLayout } from './components/SiteLayout'
import { AdminPostsPage } from './pages/AdminPostsPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { HomePage } from './pages/HomePage'
import { MyStoriesPage } from './pages/MyStoriesPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PostEditorPage } from './pages/PostEditorPage'
import { PostPage } from './pages/PostPage'
import { SignInPage } from './pages/SignInPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="signin" element={<SignInPage />} />
          <Route path="posts/:slug" element={<PostPage />} />
          <Route element={<RequireRole minimumRole="writer" />}>
            <Route path="my-stories" element={<MyStoriesPage />} />
            <Route path="write" element={<PostEditorPage />} />
            <Route path="write/:slug" element={<PostEditorPage />} />
          </Route>
          <Route element={<RequireRole minimumRole="admin" />}>
            <Route path="admin/posts" element={<AdminPostsPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
          </Route>
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
