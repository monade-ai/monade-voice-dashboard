export default function AuthCodeErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Authentication Error</h1>
        <p className="text-gray-700">
          There was an issue with your authentication link. Please try again or contact support.
        </p>
      </div>
    </div>
  );
}
