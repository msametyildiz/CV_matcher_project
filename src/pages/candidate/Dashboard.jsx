import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Briefcase, Users, Clock, Plus, BarChart2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import MainLayout from '../../components/layouts/MainLayout';
import Loader from '../../components/common/Loader';
import ErrorMessage from '../../components/common/ErrorMessage';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    activeJobs: [],
    recentApplications: [],
    stats: { totalJobs: 0, totalApplications: 0, activeJobs: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Mock data for development
        setTimeout(() => {
          setDashboardData({
            activeJobs: [
              { id: 1, title: 'Frontend Developer', location: 'Remote', applicationsCount: 12, createdAt: '2023-05-01', applicationDeadline: '2023-06-01' },
              { id: 2, title: 'UX Designer', location: 'New York', applicationsCount: 8, createdAt: '2023-05-05', applicationDeadline: '2023-06-15' },
            ],
            recentApplications: [
              { id: 1, candidateName: 'John Doe', jobTitle: 'Frontend Developer', jobId: 1, appliedDate: '2023-05-10' },
              { id: 2, candidateName: 'Jane Smith', jobTitle: 'UX Designer', jobId: 2, appliedDate: '2023-05-12' },
            ],
            stats: {
              totalJobs: 5,
              totalApplications: 25,
              activeJobs: 2
            }
          });
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
        toast.error('Error loading dashboard data');
      }
    };
    
    fetchData();
  }, []);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const content = () => {
    if (isLoading) return <Loader />;
    if (error) return <ErrorMessage message={error} />;
    
    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-white">Welcome, {user?.name || 'Candidate'}!</h1>
              <p className="text-blue-100">Here's an overview of your job search activity</p>
            </div>
            <div className="flex space-x-3">
              <Link 
                to="/candidate/jobs" 
                className="btn-light"
              >
                <Briefcase className="mr-2 h-4 w-4" />
                Browse Jobs
              </Link>
              <Link 
                to="/candidate/applications" 
                className="btn-dark"
              >
                <Clock className="mr-2 h-4 w-4" />
                My Applications
              </Link>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md bg-blue-100 p-3 text-blue-600">
                <Briefcase className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-500">Active Jobs</h2>
                <span className="text-2xl font-bold text-gray-900">{dashboardData.stats.activeJobs}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md bg-green-100 p-3 text-green-600">
                <Users className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-500">Applications</h2>
                <span className="text-2xl font-bold text-gray-900">{dashboardData.stats.totalApplications}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md bg-purple-100 p-3 text-purple-600">
                <Briefcase className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-500">Total Jobs</h2>
                <span className="text-2xl font-bold text-gray-900">{dashboardData.stats.totalJobs}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Applications */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Applications</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {dashboardData.recentApplications.length > 0 ? (
              dashboardData.recentApplications.map((application) => (
                <div key={application.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">{application.jobTitle}</h3>
                      <div className="mt-1 text-sm text-gray-500">Applied on {formatDate(application.appliedDate)}</div>
                    </div>
                    <Link 
                      to={`/candidate/applications`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      View Application
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center">
                <Users className="h-8 w-8 text-gray-400 mx-auto" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No applications yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start browsing jobs and submit your first application.
                </p>
                <div className="mt-6">
                  <Link
                    to="/candidate/jobs"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Browse Jobs
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/candidate/jobs"
              className="flex flex-col items-center justify-center p-4 border border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <Briefcase className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Find Jobs</span>
            </Link>
            <Link
              to="/candidate/cv"
              className="flex flex-col items-center justify-center p-4 border border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <Plus className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Upload CV</span>
            </Link>
            <Link
              to="/candidate/profile"
              className="flex flex-col items-center justify-center p-4 border border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <BarChart2 className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Complete Profile</span>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      {content()}
    </MainLayout>
  );
};

export default Dashboard; 