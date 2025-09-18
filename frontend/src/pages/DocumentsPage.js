import React from 'react';

const DocumentsPage = () => {
  return (
    <div className="documents-page">
      <div className="page-header">
        <h1>Documents</h1>
        <p>Access course materials and resources.</p>
      </div>

      <div className="documents-content">
        <div className="empty-state">
          <i className="fas fa-folder"></i>
          <h3>No documents found</h3>
          <p>Course materials will appear here when available.</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;