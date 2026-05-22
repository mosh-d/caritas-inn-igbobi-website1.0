import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { SERVER_BASE_URL } from "../../utils/server-config";

/**
 * Schema Component - Fetches and injects JSON-LD schema markup
 * @param {number} branchId - The branch ID to fetch schema for
 */
export default function SchemaMarkup({ branchId }) {
  const [schema, setSchema] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const response = await fetch(
          `${SERVER_BASE_URL}/api/schema`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ branchId }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setSchema(data);
      } catch (err) {
        console.error("Error fetching schema:", err);
        setError(err.message);
      }
    };

    if (branchId) {
      fetchSchema();
    }
  }, [branchId]);

  if (error) {
    console.warn("Schema fetch failed:", error);
    return null;
  }

  if (!schema) {
    return null;
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
