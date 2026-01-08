import { Helmet } from "react-helmet";

const SEO = ({
  title = "Caritas Inn Igbobi | Luxury Accommodation in Yaba, Lagos",
  description = "Experience luxury and comfort at Caritas Inn Igbobi. Book your stay at our premium hotel in Yaba, Lagos.",
  keywords = "hotel, lagos, accommodation, caritas inn, igbobi, yaba, waec, luxury hotel, nigeria, business hotel, vacation",
  image = "/ring-ruby-logo.webp",
  url = typeof window !== "undefined"
    ? window.location.href
    : "https://caritasinnigbobi.fivecloverhotels.com",
  type = "website",
}) => {
  const siteName = "Caritas Inn Igbobi";
  const siteUrl = "https://caritasinnigbobi.fivecloverhotels.com";
  const twitterHandle = "@fivecloverhotel";

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      {/* Viewport should only be in the root HTML */}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Favicon */}
      <link rel="icon" type="image/svg+xml" href="/five-clover-logo.svg" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Preconnect to important domains */}
      <link rel="preconnect" href="https://www.google-analytics.com" />
      <link rel="preconnect" href="https://maps.googleapis.com" />
    </Helmet>
  );
};

export default SEO;
