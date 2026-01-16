// src/components/common/Pagination/Pagination.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import styles from './Pagination.module.scss';

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage
}) => {
  const getPageNumbers = () => {
    const pages = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  /* 
    DEFENSIVE CODING:
    Ensure we have valid numbers to prevent "NaN" in UI.
    If totalItems is 0, startItem/endItem should reflect that (0-0).
  */
  const safeCurrentPage = Number(currentPage) || 1;
  const safeItemsPerPage = Number(itemsPerPage) || 10;
  const safeTotalItems = Number(totalItems) || 0;

  // Calculate raw range
  const rawStart = (safeCurrentPage - 1) * safeItemsPerPage + 1;
  const rawEnd = Math.min(safeCurrentPage * safeItemsPerPage, safeTotalItems);

  // Clamp values for UI display
  const startItem = safeTotalItems === 0 ? 0 : rawStart;
  const endItem = safeTotalItems === 0 ? 0 : rawEnd;

  return (
    <div className={styles.paginationWrapper}>
      <div className={styles.paginationInfo}>
        Showing {startItem} to {endItem} of {safeTotalItems} results
      </div>

      <div className={styles.pagination}>
        <button
          className={styles.pageButton}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className={styles.ellipsis}>...</span>
          ) : (
            <button
              key={page}
              className={`${styles.pageButton} ${currentPage === page ? styles.active : ''}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        ))}

        <button
          className={styles.pageButton}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
