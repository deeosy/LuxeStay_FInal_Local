import { Helmet } from 'react-helmet-async';
import { JsonLd } from 'react-schemaorg';
import { useLocation } from 'react-router-dom';

const SEOMetadata = ({ 
  title, 
  description, 
  canonical, 
  ogType = 'website', 
  ogImage,
  schema,
  indexable = true
}) => {
  const location = useLocation();
  const currentUrl = canonical || `https://luxestayhaven.com${location.pathname}`;
  const defaultImage = "https://luxestayhaven.com/og-image.jpg"; // Placeholder

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        {indexable && <link rel="canonical" href={currentUrl} />}
        {!indexable && <meta name="robots" content="noindex,follow" />}

        {/* OpenGraph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={ogType} />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:image" content={ogImage || defaultImage} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage || defaultImage} />
      </Helmet>

      {indexable && schema && (Array.isArray(schema) ? schema.map((s, i) => <JsonLd key={i} item={s} />) : <JsonLd item={schema} />)}
    </>
  );
};

export default SEOMetadata;
