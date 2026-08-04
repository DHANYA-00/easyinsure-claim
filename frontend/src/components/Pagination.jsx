function buildPageItems(currentPage, totalPages) {
  if (totalPages <= 1) {
    return [];
  }

  const items = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const pages = Array.from(items)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const output = [];
  let previousPage = 0;

  pages.forEach((page) => {
    if (page - previousPage > 1) {
      output.push('ellipsis-' + page);
    }

    output.push(page);
    previousPage = page;
  });

  return output;
}

function Pagination({ currentPage, totalPages, onPageChange, summary }) {
  if (!totalPages || totalPages <= 1) {
    return summary ? <div className="pagination-summary">{summary}</div> : null;
  }

  const pageItems = buildPageItems(currentPage, totalPages);

  return (
    <div className="pagination-bar">
      {summary && <div className="pagination-summary">{summary}</div>}
      <div className="pagination-controls" aria-label="Pagination">
        <button
          type="button"
          className="pagination-button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Previous
        </button>

        {pageItems.map((item) =>
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              className={`pagination-button pagination-number${item === currentPage ? ' is-active' : ''}`}
              onClick={() => onPageChange(item)}
              aria-current={item === currentPage ? 'page' : undefined}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="pagination-ellipsis" aria-hidden="true">
              …
            </span>
          ),
        )}

        <button
          type="button"
          className="pagination-button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default Pagination;
