import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { WebSocketProvider } from "./context/WebSocketContext";

import HomePage from "./pages/Home";
import AboutPage from "./pages/About";
import ContactPage from "./pages/Contact";
import BookingConfirmationPage from "./pages/BookingConfirmation";
import RootLayout from "./pages/Root";
import AdminRootLayout from "./admin_pages/AdminRoot";
import ErrorPage from "./pages/Error";
import AdminOverview from "./admin_pages/AdminOverview";
// Bookings tab retired in favor of Reservations (which now also has Confirm/Early-Checkout/Export).
// Kept here, commented out, in case we need to fall back to it.
// import AdminBookings from "./admin_pages/AdminBookings";
import AdminRooms from "./admin_pages/AdminRooms";
import AdminRoomChart from "./admin_pages/AdminRoomChart";
import AdminReservations from "./admin_pages/AdminReservations";
import AdminGuests from "./admin_pages/AdminGuests";
import AdminFolios from "./admin_pages/AdminFolios";
import AdminCheckIns from "./admin_pages/AdminCheckIns";
import AdminCheckOuts from "./admin_pages/AdminCheckOuts";
import AdminInHouse from "./admin_pages/AdminInHouse";
import AdminReports from "./admin_pages/AdminReports";
import AdminAlerts from "./admin_pages/AdminAlerts";
import AdminNightAudit from "./admin_pages/AdminNightAudit";
import AdminAccount from "./admin_pages/AdminAccount";
import AdminHelp from "./admin_pages/AdminHelp";
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
      // { path: "bookings", element: <AdminBookings /> },
      { path: "rooms", element: <AdminRooms /> },
      { path: "room-chart", element: <AdminRoomChart /> },
      { path: "reservations", element: <AdminReservations /> },
      { path: "guests", element: <AdminGuests /> },
      { path: "folios", element: <AdminFolios /> },
      { path: "check-ins", element: <AdminCheckIns /> },
      { path: "check-outs", element: <AdminCheckOuts /> },
      { path: "in-house", element: <AdminInHouse /> },
      { path: "reports", element: <AdminReports /> },
      { path: "night-audit", element: <AdminNightAudit /> },
      { path: "alerts", element: <AdminAlerts /> },
      { path: "account", element: <AdminAccount /> },
      { path: "help", element: <AdminHelp /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return (
    <WebSocketProvider>
      <RouterProvider router={router} />
    </WebSocketProvider>
  );
}
