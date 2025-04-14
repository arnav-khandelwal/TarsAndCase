import { useState } from 'react';
import TableRow from '../TableRow/TableRow';
import './DataTable.css';

const DataTable = ({ 
  onSuccess, 
  onError, 
  onRowSubmit, 
  maxScores = Array(11).fill(0),
  submissionLimits = {},
  maxSubmissionsPerRow = 5
}) => {
  const [tableData, setTableData] = useState(Array(11).fill().map(() => ({
    file: null,
    aiResponse: ''
  })));
  const [submitting, setSubmitting] = useState(false);

  const handleRowDataChange = (rowIndex, rowData) => {
    const newTableData = [...tableData];
    newTableData[rowIndex] = rowData;
    setTableData(newTableData);
  };

  // Handle individual row submission
  const handleRowSubmit = async (rowIndex, formData) => {
    // Check if user has reached submission limit for this row
    const rowLimits = submissionLimits[rowIndex + 1];
    if (rowLimits && rowLimits.remaining <= 0) {
      onError(`You've reached the maximum limit of ${maxSubmissionsPerRow} submissions for row #${rowIndex + 1}`);
      throw new Error(`You've reached the maximum limit of ${maxSubmissionsPerRow} submissions for row #${rowIndex + 1}`);
    }
    
    // Debug: Check what's received
    console.log('DataTable received formData:', formData);
    
    if (!formData.get('image')) {
      throw new Error('No image found in form data');
    }
  
    try {
      // Debug: Log formData contents
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }
  
      const response = await onRowSubmit(rowIndex, formData);
      
      // Notify parent about success after submission
      onSuccess(`Row ${rowIndex + 1} successfully submitted!`);
      
      return {
        aiResponse: `Similarity score: ${response.aiScore}/10`,
        aiScore: response.aiScore,
        submissionsRemaining: response.submissionsRemaining
      };
    } catch (error) {
      console.error('Row submission error:', error);
      onError(error.message || 'Failed to submit image');
      throw error;
    }
  };

  // Handle entire form submission for any pending rows
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Get all rows that have files but haven't been submitted yet
    const pendingRows = tableData.filter(row => 
      row.file !== null && !row.aiResponse
    );
    
    if (pendingRows.length === 0) {
      onError('No pending images to submit');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Process all pending rows one by one
      for (const row of pendingRows) {
        await onRowSubmit(row.file);
      }
      
      // Reset all rows
      setTableData(Array(11).fill().map(() => ({
        file: null,
        aiResponse: ''
      })));
      
      onSuccess('All pending images have been submitted!');
    } catch (error) {
      onError(error.message || 'Failed to submit images');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate submissions remaining for a row
  const getSubmissionsRemaining = (rowIndex) => {
    const rowLimits = submissionLimits[rowIndex + 1];
    if (!rowLimits) return maxSubmissionsPerRow;
    return rowLimits.remaining;
  };

  // Check if a row has reached its submission limit
  const isRowLimitReached = (rowIndex) => {
    return getSubmissionsRemaining(rowIndex) <= 0;
  };

  return (
    <div className="data-table">
      <form onSubmit={handleSubmit}>
        <table className="table table-bordered">
          <thead>
            <tr>
              <th className="serial-number-header">#</th>
              <th className="image-header">Image</th>
              <th className="action-header">Action</th>
              <th className="ai-header">AI Output</th>
              <th className="max-score-header">Max Score</th>
              <th className="submissions-header">Submissions</th>
            </tr>
          </thead>
          <tbody>
            {Array(11).fill().map((_, index) => (
              <TableRow 
                key={index} 
                rowIndex={index}
                onDataChange={handleRowDataChange}
                onRowSubmit={handleRowSubmit}
                maxScore={maxScores[index]}
                submissionsRemaining={getSubmissionsRemaining(index)}
                isLimitReached={isRowLimitReached(index)}
                maxSubmissions={maxSubmissionsPerRow}
              />
            ))}
          </tbody>
        </table>
        
        <div className="submit-container">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Processing...' : 'Submit All Pending'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DataTable;