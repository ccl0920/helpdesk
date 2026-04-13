import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

interface TestWrapperProps {
  children: React.ReactNode;
  route?: string;
  routePath?: string;
}

function TestWrapper({ children, route = '/', routePath = '*' }: TestWrapperProps) {
  return (
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={routePath} element={
          <QueryClientProvider client={createTestQueryClient()}>
            <AuthProvider>{children}</AuthProvider>
          </QueryClientProvider>
        } />
      </Routes>
    </MemoryRouter>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  route?: string;
  routePath?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  { wrapper: _wrapper, route = '/', routePath = '*', ...renderOptions }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <TestWrapper route={route} routePath={routePath}>{children}</TestWrapper>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
