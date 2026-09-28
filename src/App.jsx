import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { WebSocketProvider } from "./context/WebSocketContext";

import HomePage from "./pages/Home";
import AboutPage from "./pages/About";
import ContactPage from "./pages/Contact";
import BookingConfirmationPage from "./pages/BookingConfirmation";
import RootLayout from "./pages/Root";
import PrivacyPolicyPage from "./pages/PrivacyPolicy";
import TermsOfServicePage from "./pages/TermsOfService";
import ErrorPage from "./pages/Error";
import NotFound from "./pages/NotFound";
import AdminMovedToPms from "./admin_pages/AdminMovedToPms";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "about", element: <AboutPage /> },
      { path: "contact", element: <ContactPage /> },
      { path: "booking-confirmation", element: <BookingConfirmationPage /> },
      { path: "privacy-policy", element: <PrivacyPolicyPage /> },
      { path: "terms-of-service", element: <TermsOfServicePage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  // The PMS moved to fivecloverhotels.com/pms (2026-09-28). Every /admin
  // address answers with the card that opens the same page there; the old
  // admin pages stay in admin_pages/, unrouted, until the new PMS has
  // settled in.
  { path: "/admin/*", element: <AdminMovedToPms />, errorElement: <ErrorPage /> },
]);

export default function App() {
  return (
    <WebSocketProvider>
      <RouterProvider router={router} />
    </WebSocketProvider>
  );
}
