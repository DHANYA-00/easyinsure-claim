import { useCallback, useEffect, useState } from 'react';
import Pagination from '../components/Pagination';
import CustomSelect from '../components/CustomSelect';
import { apiRequest } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PAGE_SIZE = 10;

function InsurerDashboard({ user, onLogout }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [selectedClaimFiles, setSelectedClaimFiles] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [insurerComments, setInsurerComments] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const loadClaims = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const effectiveStatus = filters.status !== undefined ? filters.status : statusFilter;
      const effectiveMinAmount = filters.minAmount !== undefined ? filters.minAmount : minAmount;
      const effectiveMaxAmount = filters.maxAmount !== undefined ? filters.maxAmount : maxAmount;
      const effectiveFromDate = filters.fromDate !== undefined ? filters.fromDate : fromDate;
      const effectiveToDate = filters.toDate !== undefined ? filters.toDate : toDate;

      const params = new URLSearchParams();

      if (effectiveStatus) {
        params.append('status', effectiveStatus);
      }

      if (effectiveMinAmount) {
        params.append('minAmount', effectiveMinAmount);
      }

      if (effectiveMaxAmount) {
        params.append('maxAmount', effectiveMaxAmount);
      }

      if (effectiveFromDate) {
        params.append('fromDate', effectiveFromDate);
      }

      if (effectiveToDate) {
        params.append('toDate', effectiveToDate);
      }

      const query = params.toString();
      const data = await apiRequest(query ? `/claims?${query}` : '/claims');
      setClaims(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load claims.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, maxAmount, minAmount, statusFilter, toDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentPage(1);
      loadClaims();
    }, 220);

    return () => window.clearTimeout(timer);
  }, [loadClaims]);

  function clearFilters() {
    setStatusFilter('');
    setMinAmount('');
    setMaxAmount('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
    loadClaims({ status: '', minAmount: '', maxAmount: '', fromDate: '', toDate: '' });
  }

  function formatDate(date) {
    if (!date) {
      return '—';
    }

    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatCurrency(amount) {
    if (amount === undefined || amount === null || amount === '') {
      return '—';
    }

    return `₹${Number(amount).toLocaleString('en-IN')}`;
  }

  function getFileNameWithoutExtension(filename) {
    if (!filename) {
      return 'Document';
    }
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return filename;
    }
    return filename.substring(0, lastDotIndex);
  }

  function getDocumentItems(claim) {
    if (Array.isArray(claim?.documents) && claim.documents.length > 0) {
      return claim.documents;
    }

    if (claim?.document) {
      return [
        {
          filename: claim.document,
          originalName: claim.documentOriginalName || claim.documentName || 'Uploaded document',
          mimeType: claim.documentMimeType || 'application/octet-stream',
          size: claim.documentSize || 0,
        },
      ];
    }

    return [];
  }

  async function viewDocument(claimId, documentIndex = 0) {
    try {
      setError('');
      const endpoint = documentIndex > 0 ? `/claims/${claimId}/documents/${documentIndex}` : `/claims/${claimId}/document`;
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Unable to access document.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      window.open(url, '_blank', 'noopener,noreferrer');

      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError(err.message || 'Failed to open document.');
    }
  }

  function openReview(claim) {
    setSelectedClaim(claim);
    setReviewStatus(claim.status === 'PENDING' ? '' : claim.status);
    setApprovedAmount(claim.approvedAmount ?? '');
    setInsurerComments(claim.insurerComments || '');
    setError('');
    setSuccess('');
  }

  function openFileViewer(claim) {
    setSelectedClaimFiles(claim);
  }

  function closeFileViewer() {
    setSelectedClaimFiles(null);
  }

  function resetReviewState() {
    setSelectedClaim(null);
    setReviewStatus('');
    setApprovedAmount('');
    setInsurerComments('');
  }

  function closeReview() {
    if (reviewing) {
      return;
    }

    resetReviewState();
  }

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSuccess('');
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [success]);

  function finishSuccessfulReview(reviewedClaimId, updatedClaim, decisionStatus) {
    setClaims((currentClaims) => currentClaims.map((claim) => (claim._id === reviewedClaimId ? updatedClaim : claim)));
    setSuccess(`Claim ${decisionStatus.toLowerCase()} successfully.`);
    resetReviewState();
  }

  async function submitReview(event) {
    event.preventDefault();

    if (!selectedClaim) {
      return;
    }

    if (selectedClaim.status !== 'PENDING') {
      setError('This claim has already been reviewed and can no longer be changed.');
      return;
    }

    const reviewedClaimId = selectedClaim._id;
    const decisionStatus = reviewStatus;

    if (!reviewStatus) {
      setError('Please select a claim status.');
      return;
    }

    if (reviewStatus === 'APPROVED' && approvedAmount === '') {
      setError('Approved amount is required when approving a claim.');
      return;
    }

    if (reviewStatus === 'APPROVED' && Number(approvedAmount) < 0) {
      setError('Approved amount cannot be negative.');
      return;
    }

    if (reviewStatus === 'APPROVED' && Number(approvedAmount) > Number(selectedClaim.claimAmount)) {
      setError('Approved amount cannot exceed the claim amount.');
      return;
    }

    try {
      setReviewing(true);
      setError('');
      setSuccess('');

      const updatedClaim = await apiRequest(`/claims/${reviewedClaimId}/review`, {
        method: 'PATCH',
        body: JSON.stringify(
          decisionStatus === 'APPROVED'
            ? {
                status: decisionStatus,
                approvedAmount: Number(approvedAmount),
                insurerComments: insurerComments.trim(),
              }
            : {
                status: decisionStatus,
                insurerComments: insurerComments.trim(),
              },
        ),
      });

      finishSuccessfulReview(reviewedClaimId, updatedClaim, decisionStatus);
    } catch (err) {
      setError(err.message || 'Failed to review claim.');
    } finally {
      setReviewing(false);
    }
  }

  const totalClaims = claims.length;
  const pendingClaims = claims.filter((claim) => claim.status === 'PENDING').length;
  const approvedClaims = claims.filter((claim) => claim.status === 'APPROVED').length;
  const rejectedClaims = claims.filter((claim) => claim.status === 'REJECTED').length;
  const displayedClaims = claims;
  const totalPages = Math.max(1, Math.ceil(displayedClaims.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const visibleClaims = displayedClaims.slice(startIndex, startIndex + PAGE_SIZE);
  const paginationSummary = displayedClaims.length
    ? `Showing ${startIndex + 1}-${startIndex + visibleClaims.length} of ${displayedClaims.length} claims`
    : '';
  const emptyStateTitle = 'No claims found';
  const emptyStateText = 'There are no claims matching the current filters.';

  const documentItems = getDocumentItems(selectedClaim);
  const fileViewerItems = getDocumentItems(selectedClaimFiles);

  return (
    <div className="insurer-dashboard">
      <header className="dashboard-header">
        <div className="brand-section">
          <div className="brand-icon">
            <img className="brand-image" src="/icons.png" alt="EasyInsure logo" />
          </div>
          <div>
            <h1>EasyInsure</h1>
            <p>Insurer Portal</p>
          </div>
        </div>

        <div className="header-user">
          <div className="header-user-info">
            <span className="header-user-email">{user?.email}</span>
            <span className="header-user-role">Insurer</span>
          </div>

          <button className="secondary-button" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="welcome-section">
          <h2>Claims Management</h2>
          <p>Review submitted claims, verify documents, and approve or reject each request.</p>
        </section>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <span>Total Claims</span>
              <div className="stat-icon">#</div>
            </div>
            <strong>{totalClaims}</strong>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span>Pending Review</span>
              <div className="stat-icon">⏳</div>
            </div>
            <strong>{pendingClaims}</strong>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span>Approved</span>
              <div className="stat-icon">✓</div>
            </div>
            <strong>{approvedClaims}</strong>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span>Rejected</span>
              <div className="stat-icon">!</div>
            </div>
            <strong>{rejectedClaims}</strong>
          </div>
        </div>

        <section className="filters-section">
          <div className="section-header">
            <div>
              <h2>Filter Claims</h2>
              <p>Adjust the view instantly to focus on high-priority items.</p>
            </div>
            <div className="section-actions section-actions-wrap">
              <button className="secondary-button" type="button" onClick={clearFilters} disabled={loading}>
                Clear Filters
              </button>
            </div>
          </div>

          <div className="filters-grid">
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <CustomSelect
                id="status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' },
                ]}
                placeholder="Filter by status"
              />
            </div>

            <div className="form-group">
              <label htmlFor="minAmount">Minimum Amount</label>
              <input id="minAmount" type="number" min="0" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} placeholder="₹0" />
            </div>

            <div className="form-group">
              <label htmlFor="maxAmount">Maximum Amount</label>
              <input id="maxAmount" type="number" min="0" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} placeholder="₹100000" />
            </div>

            <div className="form-group">
              <label htmlFor="fromDate">From Date</label>
              <input id="fromDate" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </div>

            <div className="form-group">
              <label htmlFor="toDate">To Date</label>
              <input id="toDate" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </div>
          </div>
        </section>

        <section className="claims-section">
          <div className="section-header">
            <div>
              <h2>Submitted Claims</h2>
              <p>Review and manage claims submitted by patients.</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => loadClaims()} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && !selectedClaim && <div className="success-message">{success}</div>}

          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon">↻</div>
              <h3>Loading claims</h3>
              <p>Please wait while claims are retrieved.</p>
            </div>
          ) : displayedClaims.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">#</div>
              <h3>{emptyStateTitle}</h3>
              <p>{emptyStateText}</p>
            </div>
          ) : (
            <div className="claims-table-shell">
              <div className="claims-table-wrapper">
                <table className="claims-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Email</th>
                    <th>Claim Amount</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Files</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleClaims.map((claim) => (
                    <tr key={claim._id}>
                      <td>
                        <span className="claim-patient-name">{claim.name}</span>
                      </td>
                      <td>{claim.email}</td>
                      <td>{formatCurrency(claim.claimAmount)}</td>
                      <td>
                        <span className={`status status-${String(claim.status).toLowerCase()}`}>{claim.status}</span>
                      </td>
                      <td>{formatDate(claim.submissionDate)}</td>
                      <td>
                        {getDocumentItems(claim).length > 0 ? (
                          <button className="link-button" type="button" onClick={() => openFileViewer(claim)}>
                            View
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <button
                          className={claim.status === 'PENDING' ? 'primary-button small-button' : 'secondary-button small-button'}
                          type="button"
                          onClick={() => openReview(claim)}
                        >
                          {claim.status === 'PENDING' ? 'Review Claim' : 'Reviewed'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>

              <Pagination currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} summary={paginationSummary} />
            </div>
          )}
        </section>
      </main>

      {selectedClaim && (
        <div className="modal-overlay" onClick={closeReview}>
          <div className="modal-card review-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedClaim.status === 'PENDING' ? 'Review Claim' : 'Claim Details'}</h2>
                <p>Claim ID: {selectedClaim._id}</p>
              </div>
              <button type="button" className="close-button" onClick={closeReview} disabled={reviewing}>
                ×
              </button>
            </div>

            <hr className="modal-divider" />

            <form onSubmit={submitReview} className="review-modal-form">
              <div className="modal-body-scroll">
                <div className="review-summary-card">
                  <div className="review-summary-card-header">
                    <h3>Claim Summary</h3>
                    <p>
                      {selectedClaim.status === 'PENDING'
                        ? 'Review the submission details before recording the final decision.'
                        : 'Inspect the claim details and the existing review outcome.'}
                    </p>
                  </div>

                  <div className="claim-details-grid">
                    <div className="claim-detail-item">
                      <span className="claim-detail-label">Patient</span>
                      <span className="claim-detail-value">{selectedClaim.name}</span>
                    </div>
                    <div className="claim-detail-item">
                      <span className="claim-detail-label">Email</span>
                      <span className="claim-detail-value text-wrap-anywhere">{selectedClaim.email}</span>
                    </div>
                    <div className="claim-detail-item">
                      <span className="claim-detail-label">Claim Amount</span>
                      <span className="claim-detail-value">{formatCurrency(selectedClaim.claimAmount)}</span>
                    </div>
                    <div className="claim-detail-item">
                      <span className="claim-detail-label">Submitted</span>
                      <span className="claim-detail-value">{formatDate(selectedClaim.submissionDate)}</span>
                    </div>
                    <div className="claim-detail-item">
                      <span className="claim-detail-label">Status</span>
                      <span className="claim-detail-value">
                        <span className={`status status-${String(selectedClaim.status).toLowerCase()}`}>{selectedClaim.status}</span>
                      </span>
                    </div>
                    <div></div>
                    <div className="claim-detail-item claim-detail-full">
                      <span className="claim-detail-label">Description</span>
                      <span className="claim-detail-value text-wrap-anywhere">{selectedClaim.description || 'No description provided.'}</span>
                    </div>
                    <div className="claim-detail-item claim-detail-full">
                      <span className="claim-detail-label">Documents</span>
                      <span className="claim-detail-value">
                        {documentItems.length > 0 ? (
                          <div className="detail-documents-row">
                            <span>Files attached</span>
                            <button className="link-button detail-link-button" type="button" onClick={() => openFileViewer(selectedClaim)}>
                              View files
                            </button>
                          </div>
                        ) : (
                          'No supporting documents attached.'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="review-decision-card">
                  <div className="review-decision-card-header">
                    <h3>Review Decision</h3>
                    {selectedClaim.status !== 'PENDING' ? (
                      <span className="review-badge-locked">Locked</span>
                    ) : (
                      <span className="review-badge-active">Pending Decision</span>
                    )}
                  </div>

                  {selectedClaim.status !== 'PENDING' && (
                    <div className="info-message">
                      This claim has already been reviewed. You can inspect the submitted details here.
                    </div>
                  )}

                  {success && <div className="success-message">{success}</div>}
                  {error && <div className="error-message">{error}</div>}

                  <div className="review-form-fields">
                    <div className="form-group">
                      <label htmlFor="reviewStatus">Decision / Status</label>
                      <CustomSelect
                        id="reviewStatus"
                        value={reviewStatus}
                        onChange={(event) => {
                          const nextStatus = event.target.value;
                          setReviewStatus(nextStatus);

                          if (nextStatus !== 'APPROVED') {
                            setApprovedAmount('');
                          }
                        }}
                        disabled={reviewing || selectedClaim.status !== 'PENDING'}
                        options={[
                          { value: 'APPROVED', label: 'Approve' },
                          { value: 'REJECTED', label: 'Reject' },
                        ]}
                        placeholder="Choose a decision"
                      />
                    </div>

                    {reviewStatus === 'APPROVED' && (
                      <div className="form-group">
                        <label htmlFor="approvedAmount">Approved Amount</label>
                        <input
                          id="approvedAmount"
                          type="number"
                          min="0"
                          max={selectedClaim.claimAmount}
                          step="0.01"
                          value={approvedAmount}
                          onChange={(event) => setApprovedAmount(event.target.value)}
                          placeholder="Enter approved amount"
                          disabled={reviewing || selectedClaim.status !== 'PENDING'}
                          required
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="insurerComments">Insurer Comments</label>
                      <textarea
                        id="insurerComments"
                        value={insurerComments}
                        onChange={(event) => setInsurerComments(event.target.value)}
                        placeholder="Add review comments for the patient..."
                        disabled={reviewing || selectedClaim.status !== 'PENDING'}
                        rows="4"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-button" onClick={closeReview} disabled={reviewing}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={reviewing || selectedClaim.status !== 'PENDING'}>
                  {reviewing ? 'Saving...' : selectedClaim.status === 'PENDING' ? 'Save Decision' : 'Review Locked'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedClaimFiles && (
        <div className="modal-overlay" onClick={closeFileViewer}>
          <div className="modal-card files-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Attached Files</h2>
                <p>View only the claim documents uploaded for this claim.</p>
              </div>
              <button type="button" className="close-button" onClick={closeFileViewer}>
                ×
              </button>
            </div>

            <hr className="modal-divider" />

            <div className="modal-body-scroll">
              <div className="document-list modal-document-list">
                {fileViewerItems.length > 0 ? (
                  fileViewerItems.map((document, index) => (
                    <button
                      key={`${document.filename || document.originalName}-${index}`}
                      className="secondary-button small-button"
                      type="button"
                      onClick={() => viewDocument(selectedClaimFiles._id, index)}
                    >
                      {getFileNameWithoutExtension(document.originalName)}
                    </button>
                  ))
                ) : (
                  <p className="claim-detail-value">No supporting documents available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InsurerDashboard;
