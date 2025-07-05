import { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

const DISCORD_WEBHOOK_URL = 'YOUR_DISCORD_WEBHOOK_URL'; // Replace with your webhook URL

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const sendToDiscord = async (data: typeof formData) => {
    const message = {
      embeds: [{
        title: 'New Contact Form Submission',
        color: 0x3b82f6,
        fields: [
          { name: 'Name', value: data.name, inline: true },
          { name: 'Email', value: data.email, inline: true },
          { name: 'Subject', value: data.subject },
          { name: 'Message', value: data.message }
        ],
        timestamp: new Date().toISOString()
      }]
    };

    try {
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) throw new Error('Failed to send message');
      return true;
    } catch (err) {
      console.error('Error sending to Discord:', err);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const success = await sendToDiscord(formData);
      if (success) {
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
    
    // Reset submission status after 5 seconds
    setTimeout(() => {
      setSubmitted(false);
    }, 5000);
  };

  return (
    <section id="contact" className="py-20 bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Get In Touch
            </h2>
            <p className="text-blue-200 max-w-2xl mx-auto text-lg">
              Have a project in mind or want to discuss potential opportunities?
              I'd love to hear from you.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl p-8 order-2 lg:order-1">
              <h3 className="text-2xl font-semibold text-white mb-6">
                Send a Message
              </h3>
              
              {submitted ? (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg p-6 text-center my-8">
                  <p className="text-lg font-medium">Message sent successfully!</p>
                  <p className="mt-2">I'll get back to you as soon as possible.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label htmlFor="name" className="block text-white mb-2 font-medium">
                        Name
                      </label>
                      <input 
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Your name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-white mb-2 font-medium">
                        Email
                      </label>
                      <input 
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Your email"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="subject" className="block text-white mb-2 font-medium">
                      Subject
                    </label>
                    <input 
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Subject"
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="message" className="block text-white mb-2 font-medium">
                      Message
                    </label>
                    <textarea 
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                      placeholder="Your message..."
                    ></textarea>
                  </div>
                  
                  {error && (
                    <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-6">
                      {error}
                    </div>
                  )}
                  
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg px-6 py-3 transition-all w-full flex items-center justify-center disabled:opacity-70"
                  >
                    {isSubmitting ? 'Sending...' : (
                      <>
                        Send Message
                        <Send size={18} className="ml-2" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
            
            <div className="order-1 lg:order-2">
              <div className="bg-gradient-to-br from-gray-800/50 to-blue-900/50 backdrop-blur-xl rounded-2xl shadow-xl p-8 h-full">
                <h3 className="text-2xl font-semibold text-white mb-8">
                  Contact Information
                </h3>
                
                <div className="space-y-6 mb-10">
                  <div className="flex items-start">
                    <div className="bg-blue-500/10 p-3 rounded-lg mr-4">
                      <Mail size={24} className="text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white mb-1">Email</h4>
                      <a href="mailto:contact@example.com" className="text-blue-300 hover:text-blue-200 transition-colors">
                        contact@example.com
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-blue-500/10 p-3 rounded-lg mr-4">
                      <Phone size={24} className="text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white mb-1">Phone</h4>
                      <a href="tel:+1234567890" className="text-blue-300 hover:text-blue-200 transition-colors">
                        +1 (234) 567-890
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-blue-500/10 p-3 rounded-lg mr-4">
                      <MapPin size={24} className="text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white mb-1">Location</h4>
                      <p className="text-blue-300">
                        San Francisco, California
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-500/10 rounded-lg p-6">
                  <h4 className="font-medium text-white mb-3">Availability</h4>
                  <p className="text-blue-200 mb-4">
                    I'm currently available for freelance work and full-time positions.
                    My usual response time is within 24 hours.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-blue-300 mb-1">Mon - Fri</p>
                      <p className="font-medium text-white">9:00 AM - 6:00 PM</p>
                    </div>
                    <div>
                      <p className="text-blue-300 mb-1">Sat</p>
                      <p className="font-medium text-white">10:00 AM - 2:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;