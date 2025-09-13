import React, { useState } from 'react';
import Papa from 'papaparse';
import './App.css';

function App() {
  const [uploadedData, setUploadedData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Email regex pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Generate random alias email
  const generateAlias = (email) => {
    const localPart = email.split('@')[0];
    const firstChar = localPart.charAt(0).toLowerCase();
    const randomNum = Math.floor(Math.random() * 10000);
    const randomChars = Math.random().toString(36).substring(2, 5);
    return `${firstChar}${randomNum}${randomChars}@myapp.com`;
  };

  // Find column by name (case-insensitive, fuzzy)
  const findColumn = (row, possibleNames) => {
    const keys = Object.keys(row);
    for (const key of keys) {
      const lowerKey = key.toLowerCase().trim();
      if (possibleNames.some(name => lowerKey.includes(name))) {
        return row[key];
      }
    }
    return null;
  };

  // Extract emails from any value using regex
  const extractEmail = (value) => {
    if (!value) return null;
    const stringValue = String(value).trim();
    if (emailRegex.test(stringValue)) return stringValue;
    const emailMatch = stringValue.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return emailMatch ? emailMatch[0] : null;
  };

  // Process CSV with headers
  const processWithHeaders = (results) => {
    const data = results.data.filter(row => Object.values(row).some(val => val));

    if (data.length === 0) {
      setError('No valid data found in CSV');
      setIsProcessing(false);
      return;
    }

    const processed = [];
    let emailsFound = 0;

    data.forEach((row) => {
      const firstName = findColumn(row, ['first', 'fname', 'firstname', 'given']) || '';
      const lastName  = findColumn(row, ['last', 'lname', 'lastname', 'surname', 'family']) || '';

      // Prefer known email columns first; fallback to scanning all cells
      let email = findColumn(row, ['email', 'e-mail', 'mail', 'address']);
      if (!email) {
        for (const value of Object.values(row)) {
          const extracted = extractEmail(value);
          if (extracted) { email = extracted; break; }
        }
      } else {
        email = extractEmail(email);
      }

      if (email) {
        emailsFound++;
        processed.push({
          id: processed.length + 1,
          firstName: firstName || '',
          lastName: lastName || '',
          originalEmail: email,
          aliasEmail: generateAlias(email)
        });
      }
    });

    if (emailsFound === 0) {
      setError('No valid email addresses found in the CSV file');
      setIsProcessing(false);
      return;
    }

    setUploadedData(data);
    setProcessedData(processed);
    setIsProcessing(false);
  };

  // Process CSV without headers
  const processWithoutHeaders = (results) => {
    const data = results.data.filter(row => row.some(val => val));

    if (data.length === 0) {
      setError('No valid data found in CSV');
      setIsProcessing(false);
      return;
    }

    const processed = [];
    let emailsFound = 0;

    data.forEach((row) => {
      row.forEach((cell, cellIndex) => {
        const email = extractEmail(cell);
        if (!email) return;

        emailsFound++;

        // Heuristic: try to infer names from previous cells
        let firstName = '';
        let lastName = '';

        if (cellIndex > 0 && !extractEmail(row[cellIndex - 1])) {
          const prevCell = String(row[cellIndex - 1] || '').trim();
          if (prevCell && prevCell.length < 50) {
            if (cellIndex > 1 && !extractEmail(row[cellIndex - 2])) {
              const prevPrevCell = String(row[cellIndex - 2] || '').trim();
              if (prevPrevCell && prevPrevCell.length < 50) {
                firstName = prevPrevCell;
                lastName = prevCell;
              } else {
                const parts = prevCell.split(/\s+/);
                if (parts.length >= 2) {
                  firstName = parts[0];
                  lastName = parts.slice(1).join(' ');
                } else {
                  firstName = prevCell;
                }
              }
            } else {
              const parts = prevCell.split(/\s+/);
              if (parts.length >= 2) {
                firstName = parts[0];
                lastName = parts.slice(1).join(' ');
              } else {
                firstName = prevCell;
              }
            }
          }
        }

        processed.push({
          id: processed.length + 1,
          firstName,
          lastName,
          originalEmail: email,
          aliasEmail: generateAlias(email)
        });
      });
    });

    if (emailsFound === 0) {
      setError('No valid email addresses found in the CSV file');
      setIsProcessing(false);
      return;
    }

    setUploadedData(data);
    setProcessedData(processed);
    setIsProcessing(false);
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setError('');

    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setIsProcessing(true);

    // First, try with headers; if header row looks like data (e.g., contains emails), re-parse without headers
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const firstRow = results.data[0];
          if (firstRow && Object.keys(firstRow).length > 0) {
            const keysHaveEmail = Object.keys(firstRow).some(key => emailRegex.test(key));
            if (keysHaveEmail) {
              Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (noHeaderResults) => processWithoutHeaders(noHeaderResults),
                error: (err) => { setError('Error parsing CSV file: ' + err.message); setIsProcessing(false); }
              });
            } else {
              processWithHeaders(results);
            }
          } else {
            Papa.parse(file, {
              header: false,
              skipEmptyLines: true,
              complete: (noHeaderResults) => processWithoutHeaders(noHeaderResults),
              error: (err) => { setError('Error parsing CSV file: ' + err.message); setIsProcessing(false); }
            });
          }
        } catch (err) {
          setError('Error processing CSV file: ' + err.message);
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
    const fileInput = document.getElementById('csv-upload');
    if (fileInput) fileInput.value = '';
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
              Upload any CSV containing email addresses. The app auto-detects headers or no-headers and finds emails in any column.
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
