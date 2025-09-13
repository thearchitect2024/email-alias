import React, { useState } from 'react';
import Papa from 'papaparse';
import './App.css';

function App() {
  const [uploadedData, setUploadedData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Generate random alias email
  const generateAlias = (email) => {
    const localPart = email.split('@')[0];
    const firstChar = localPart.charAt(0).toLowerCase();
    const randomNum = Math.floor(Math.random() * 10000);
    const randomChars = Math.random().toString(36).substring(2, 5);
    return `${firstChar}${randomNum}${randomChars}@cdnhyd.appen.com`;
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setError('');
    
    if (!file) {
      return;
    }

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          // Validate CSV structure
          const data = results.data.filter(row => 
            row['first name'] || row['last name'] || row['email']
          );

          if (data.length === 0) {
            setError('No valid data found in CSV');
            setIsProcessing(false);
            return;
          }

          // Check for required columns
          const firstRow = data[0];
          const hasRequiredColumns = 
            'first name' in firstRow && 
            'last name' in firstRow && 
            'email' in firstRow;

          if (!hasRequiredColumns) {
            setError('CSV must contain columns: first name, last name, email');
            setIsProcessing(false);
            return;
          }

          setUploadedData(data);

          // Process data and generate aliases
          const processed = data.map((row, index) => ({
            id: index + 1,
            firstName: row['first name'] || '',
            lastName: row['last name'] || '',
            originalEmail: row['email'] || '',
            aliasEmail: row['email'] ? generateAlias(row['email']) : ''
          }));

          setProcessedData(processed);
          setIsProcessing(false);
        } catch (err) {
          setError('Error processing CSV file');
          setIsProcessing(false);
        }
      },
      error: (err) => {
        setError('Error parsing CSV file: ' + err.message);
        setIsProcessing(false);
      }
    });
  };

  // Export processed data as CSV
  const exportToCSV = () => {
    const csvData = processedData.map(row => ({
      'first name': row.firstName,
      'last name': row.lastName,
      'original email': row.originalEmail,
      'alias email': row.aliasEmail
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'email_aliases.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear all data
  const clearData = () => {
    setUploadedData([]);
    setProcessedData([]);
    setError('');
    // Reset file input
    const fileInput = document.getElementById('csv-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Email Alias Generator</h1>
        <p className="subtitle">Upload a CSV file to generate email aliases</p>
      </header>

      <main className="App-main">
        <div className="upload-section">
          <div className="upload-card">
            <h2>Upload CSV File</h2>
            <p className="instructions">
              Your CSV should contain columns: <strong>first name</strong>, <strong>last name</strong>, <strong>email</strong>
            </p>
            
            <div className="file-input-wrapper">
              <input
                type="file"
                id="csv-upload"
                accept=".csv"
                onChange={handleFileUpload}
                className="file-input"
              />
              <label htmlFor="csv-upload" className="file-label">
                <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Choose CSV File
              </label>
            </div>

            {error && (
              <div className="error-message">
                <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {isProcessing && (
              <div className="processing-message">
                <div className="spinner"></div>
                Processing CSV file...
              </div>
            )}
          </div>
        </div>

        {processedData.length > 0 && (
          <div className="results-section">
            <div className="results-header">
              <h2>Generated Email Aliases</h2>
              <div className="action-buttons">
                <button onClick={exportToCSV} className="btn btn-primary">
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export to CSV
                </button>
                <button onClick={clearData} className="btn btn-secondary">
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Clear Data
                </button>
              </div>
            </div>

            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-value">{processedData.length}</div>
                <div className="stat-label">Total Emails</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{processedData.filter(d => d.aliasEmail).length}</div>
                <div className="stat-label">Aliases Generated</div>
              </div>
            </div>

            <div className="table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Original Email</th>
                    <th>Alias Email</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.map((row) => (
                    <tr key={row.id}>
                      <td className="cell-id">{row.id}</td>
                      <td>{row.firstName}</td>
                      <td>{row.lastName}</td>
                      <td className="cell-email">{row.originalEmail}</td>
                      <td className="cell-alias">
                        <span className="alias-badge">{row.aliasEmail}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;