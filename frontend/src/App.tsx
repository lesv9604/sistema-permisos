import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SolicitudesPage } from './pages/SolicitudesPage';
import { NuevaSolicitudPage } from './pages/NuevaSolicitudPage';
import { SolicitudDetallePage } from './pages/SolicitudDetallePage';
import { TiposPermisoPage } from './pages/TiposPermisoPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { ReportesPage } from './pages/ReportesPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas que exigen sesión */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/solicitudes" element={<SolicitudesPage />} />
          <Route path="/solicitudes/nueva" element={<NuevaSolicitudPage />} />
          <Route path="/solicitudes/:id" element={<SolicitudDetallePage />} />

          {/* Reportes: Talento Humano y Admin */}
          <Route
            element={<ProtectedRoute roles={['TALENTO_HUMANO', 'ADMIN']} />}
          >
            <Route path="/reportes" element={<ReportesPage />} />
          </Route>

          {/* Solo ADMIN */}
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/tipos-permiso" element={<TiposPermisoPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
