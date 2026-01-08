import { createBrowserRouter, RouterProvider } from "react-router-dom";

import HomePage from "./pages/Home";
import AboutPage from "./pages/About";
import ContactPage from "./pages/Contact";
import BookingConfirmationPage from "./pages/BookingConfirmation";
import RootLayout from "./pages/Root";
import AdminRootLayout from "./admin_pages/AdminRoot";
import ErrorPage from "./pages/Error";
import AdminOverview from "./admin_pages/AdminOverview";
import AdminBookings from "./admin_pages/AdminBookings";
import AdminLoginPage from "./admin_pages/AdminLogin";
import NotFound from "./pages/NotFound";

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
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminRootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <AdminLoginPage /> },
      { path: "overview", element: <AdminOverview /> },
      { path: "bookings", element: <AdminBookings /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
