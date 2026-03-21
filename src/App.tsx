import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/contexts/AppContext";
import MobileLayout from "@/components/layout/MobileLayout";
import Identify from "./pages/Identify";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import CalendarView from "./pages/CalendarView";
import Chat from "./pages/Chat";
import Subjects from "./pages/Subjects";
import SubjectDetail from "./pages/SubjectDetail";
import GroupProjects from "./pages/GroupProjects";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const routerBase = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

function AppRoutes() {
  const { currentUserId, isOnboarded, isUserLoading } = useApp();

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading workspace...
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <Routes>
        <Route path="/identify" element={<Identify />} />
        <Route path="*" element={<Navigate to="/identify" replace />} />
      </Routes>
    );
  }

  if (!isOnboarded) {
    return (
      <Routes>
        <Route
          path="/identify"
          element={<Navigate to="/onboarding" replace />}
        />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/identify" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/onboarding"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard"
        element={
          <MobileLayout>
            <Dashboard />
          </MobileLayout>
        }
      />
      <Route
        path="/calendar"
        element={
          <MobileLayout>
            <CalendarView />
          </MobileLayout>
        }
      />
      <Route
        path="/chat"
        element={
          <MobileLayout>
            <Chat />
          </MobileLayout>
        }
      />
      <Route
        path="/subjects"
        element={
          <MobileLayout>
            <Subjects />
          </MobileLayout>
        }
      />
      <Route
        path="/subjects/:id"
        element={
          <MobileLayout>
            <SubjectDetail />
          </MobileLayout>
        }
      />
      <Route
        path="/groups"
        element={
          <MobileLayout>
            <GroupProjects />
          </MobileLayout>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter basename={routerBase}>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
