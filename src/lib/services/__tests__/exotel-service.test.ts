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
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({ success: true, call_id: 'test-call-id' }),
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

      expect(response).toEqual({ success: true, call_id: 'test-call-id' });
    });

    it('should throw error for failed API call with JSON error response', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({ error: 'Invalid phone number' }),
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
        statusText: 'Bad Request',
        headers: {
          get: () => 'text/plain',
        },
        text: async () => 'Bad Request',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(errorResponse);

      const params = {
        phone_number: 'invalid-phone',
        callback_url: 'http://my.exotel.com/monade1/exoml/start_voice/1031301',
      };

      await expect(initiateExotelCall(params)).rejects.toThrow('Request could not be processed. Please check your input.');
    });

    it('should throw authentication error for 401 status', async () => {
      const errorResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: {
          get: () => 'text/plain',
        },
        text: async () => 'Unauthorized',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(errorResponse);

      const params = {
        phone_number: '+917795957544',
        callback_url: 'http://my.exotel.com/monade1/exoml/start_voice/1031301',
      };

      await expect(initiateExotelCall(params)).rejects.toThrow('You are not authorized to perform this action.');
    });

    it('should throw service unavailable error for 500+ status', async () => {
      const errorResponse = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          get: () => 'text/plain',
        },
        text: async () => 'Service Unavailable',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(errorResponse);

      const params = {
        phone_number: '+917795957544',
        callback_url: 'http://my.exotel.com/monade1/exoml/start_voice/1031301',
      };

      await expect(initiateExotelCall(params)).rejects.toThrow('Service is currently unavailable. Please try again later.');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const params = {
        phone_number: '+917795957544',
        callback_url: 'http://my.exotel.com/monade1/exoml/start_voice/1031301',
      };

      await expect(initiateExotelCall(params)).rejects.toThrow('Could not reach the service. Please try again later.');
    });
  });
});
