"""
Data Rollback Script
Restores data from the last backup
"""
import sys
import json
from datetime import datetime
from config import ETLConfig
from loader import DataLoader

def log_json(level: str, step: str, message: str, data: dict = None):
    """
    Output structured JSON log
    """
    log_entry = {
        'type': 'LOG',
        'level': level,
        'step': step,
        'message': message,
        'data': data or {},
        'timestamp': datetime.now().isoformat()
    }
    print(json.dumps(log_entry, ensure_ascii=False))
    sys.stdout.flush()

def main():
    """
    Execute rollback
    """
    log_json('info', 'START', 'Rollback process started')

    try:
        # Initialize Config
        config = ETLConfig()
        
        # Initialize Loader
        loader = DataLoader(config)
        
        log_json('info', 'ROLLBACK', 'Attempting to rollback data from backup...')
        
        success = loader.rollback()
        
        if success:
            result = {
                'success': True,
                'message': 'Rollback completed successfully'
            }
            log_json('info', 'SUCCESS', 'Rollback successful', result)
            return result
        else:
            raise Exception("Rollback failed (Check logs for details)")

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()

        result = {
            'success': False,
            'message': f'Rollback Failed: {str(e)}',
            'error': str(e),
            'trace': error_trace
        }

        log_json('error', 'FAILED', f'Rollback failed: {str(e)}', {
            'error': str(e)
        })

        return result

if __name__ == "__main__":
    result = main()
    
    # Final result for Node.js
    final_result = {
        'type': 'RESULT',
        'success': result['success'],
        'message': result['message'],
        'data': {},
        'error': result.get('error'),
        'timestamp': datetime.now().isoformat()
    }
    print(json.dumps(final_result, ensure_ascii=False))
    sys.exit(0 if result['success'] else 1)
