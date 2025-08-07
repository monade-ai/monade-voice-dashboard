import { initiateExotelCall } from '../exotel-service';

describe('ExotelService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateExotelCall', () => {
    it('should successfully initiate a call', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true, call_id: 'test-call-id' }),
        clone: () => ({
          text: async () => '{"success": true, "call_id": "test-call-id"}',
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const params = {
        phone_number: '+917795957544',
        callback_url: 'http://my.exotel.com/monade1/exoml/start_voice/1031301',
      };

      const response = await initiateExotelCall(params);

      expect(global.fetch).toHaveBeenCalledWith('/api/exotel/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      expect(response).toBe(mockResponse);
    });

    it('should throw error for failed API call with JSON error response', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        text: async () => '{"error": "Invalid phone number"}',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(errorResponse);

      const params = {
        phone_number: 'invalid-phone',
        callback_url: 'http://my.exotel.com/monade1/exoml/start_voice/1031301',
      };

      await expect(initiateExotelCall(params)).rejects.toThrow('Invalid phone number');
    });

    it('should throw generic error for 400 status without parseable JSON', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(errorResponse);

      const params = {
        phone_number: 'invalid-phone',
        callback_url: 'http://my.exotel.com/monade1/exoml/start_voice/1031301',
      };

      await expect(initiateExotelCall(params)).rejects.toThrow('Invalid phone number or request data');
    });

    it('should throw authentication error for 401 status', async () => {
      const errorResponse = {
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(errorResponse);

      const params = {
        phone_number: '+917795957544',
        callback_url: 'http://my.exotel.com/monade1/exoml/start_voice/1031301',
      };

      await expect(initiateExotelCall(params)).rejects.toThrow('Authentication failed');
    });

    it('should throw service unavailable error for 500+ status', async () => {
      const errorResponse = {
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(errorResponse);

      const params = {
        phone_number: '+917795957544',
        callback_url: 'http://my.exotel.com/monade1/exoml/start_voice/1031301',
      };

      await expect(initiateExotelCall(params)).rejects.toThrow('Phone service temporarily unavailable');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const params = {
        phone_number: '+917795957544',
        callback_url: 'http://my.exotel.com/monade1/exoml/start_voice/1031301',
      };

      await expect(initiateExotelCall(params)).rejects.toThrow('Network error');
    });
  });
});