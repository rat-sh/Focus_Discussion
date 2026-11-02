import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { USE_MOCK } from '@/config/env'
import { AuthProvider } from '@/shared/context/auth'
import { ProfileProvider } from '@/shared/context/profile'
import { ThemeProvider } from '@/shared/context/theme'
import { CommandProvider } from '@/shared/context/command'
import { ToastProvider } from '@/shared/ui/Toast'
import { ButtonLink } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Feedback'
import { ForgotPasswordPage, RequireAuth, ResetPasswordPage, SignInPage, SignUpPage } from '@/features/auth/AuthPages'
import { HomePage } from '@/features/home/HomePage'
import { RoomsPage } from '@/features/rooms/RoomsPage'
import { FriendsPage } from '@/features/friends/FriendsPage'
import { AddRedirect, ProfilePage } from '@/features/friends/ProfilePage'
import { MaterialsPage } from '@/features/materials/MaterialsPage'
import { FocusSetupPage } from '@/features/focus/FocusSetupPage'
import { SchedulePage } from '@/features/schedule/SchedulePage'
import { StatsPage } from '@/features/stats/StatsPage'
import { RecapPage } from '@/features/recap/RecapPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { JoinPage } from '@/features/join/JoinPage'
import { JoinByCodePage } from '@/features/join/JoinByCodePage'
import { MusicProvider } from '@/features/music/MusicProvider'
import { AppShell } from './AppShell'

const RoomPage = lazy(() => import('@/features/room/RoomPage').then((m) => ({ default: m.RoomPage })))
const FocusSessionPage = lazy(() => import('@/features/focus/FocusSessionPage').then((m) => ({ default: m.FocusSessionPage })))

const Loading = () => <div className="flex h-dvh flex-col gap-3 bg-canvas p-4"><Skeleton className="h-12" /><Skeleton className="flex-1" /></div>
const NotFound = () => (
  <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas p-6 text-center">
    <h1 className="text-lg font-semibold">Page not found</h1><ButtonLink to="/" variant="primary">Go home</ButtonLink>
  </div>
)

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ProfileProvider>
              <CommandProvider>
                <MusicProvider>
                  <Suspense fallback={<Loading />}>
                    <Routes>
                      {!USE_MOCK && <Route path="signin" element={<SignInPage />} />}
                      {!USE_MOCK && <Route path="signup" element={<SignUpPage />} />}
                      {!USE_MOCK && <Route path="forgot-password" element={<ForgotPasswordPage />} />}
                      {!USE_MOCK && <Route path="reset-password" element={<ResetPasswordPage />} />}
                      <Route element={<RequireAuth />}>
                        <Route element={<AppShell />}>
                          <Route index element={<HomePage />} />
                          <Route path="rooms/:roomId?/:sessionId?" element={<RoomsPage />} />
                          <Route path="friends" element={<FriendsPage />} />
                          <Route path="u/:handle" element={<ProfilePage />} />
                          <Route path="add/:handle" element={<AddRedirect />} />
                          <Route path="materials" element={<MaterialsPage />} />
                          <Route path="focus" element={<FocusSetupPage />} />
                          <Route path="schedule" element={<SchedulePage />} />
                          <Route path="stats" element={<StatsPage />} />
                          <Route path="recap/:id" element={<RecapPage />} />
                          <Route path="settings" element={<SettingsPage />} />
                        </Route>
                        <Route path="focus/session" element={<FocusSessionPage />} />
                        <Route path="room/:code" element={<RoomPage />} />
                      </Route>
                      <Route path="join" element={<JoinByCodePage />} />
                      <Route path="j/:code" element={<JoinPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </MusicProvider>
              </CommandProvider>
            </ProfileProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
