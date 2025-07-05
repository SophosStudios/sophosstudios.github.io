import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  content: string;
  image: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "CEO",
    company: "TechVision Inc.",
    content: "Working with this developer was an absolute pleasure. They delivered our website ahead of schedule and exceeded our expectations in terms of design and functionality. Their attention to detail and ability to translate our vision into reality was impressive.",
    image: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=800"
  },
  {
    id: 2,
    name: "David Chen",
    role: "Marketing Director",
    company: "Innovate Solutions",
    content: "Our e-commerce platform needed a complete overhaul, and they delivered beyond our expectations. The site is not only visually stunning but also performs exceptionally well. Sales have increased by 40% since the launch of our new website.",
    image: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=800"
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "Product Manager",
    company: "CreativeHub",
    content: "The developer's expertise in both design and development made our collaboration seamless. They were able to suggest improvements we hadn't even considered, resulting in a product that our users love. Their technical skills are matched by their excellent communication.",
    image: "https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=800"
  },
];

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      nextTestimonial();
    }, 8000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const nextTestimonial = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
      setIsAnimating(false);
    }, 500);
  };

  const prevTestimonial = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
      setIsAnimating(false);
    }, 500);
  };

  return (
    <section id="testimonials" className="py-24 bg-gradient-to-br from-[#0F1535] via-[#1A225A] to-[#221F67] text-white">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">💬 Client Testimonials</h2>
            <p className="text-purple-200 max-w-2xl mx-auto text-lg">
              Here’s what clients say about our collaborations and results.
            </p>
          </div>

          {/* Testimonial Content */}
          <div className="relative">
            <div className="flex justify-center items-center">
              <div
                className={`max-w-3xl transition-all duration-500 ease-in-out ${
                  isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}
              >
                <div className="relative bg-white/5 backdrop-blur-xl p-10 rounded-3xl shadow-lg border border-white/10">
                  
                  {/* Quote Icon */}
                  <div className="absolute -top-6 -left-6 text-purple-400 opacity-30">
                    <Quote size={60} />
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <img
                      src={testimonials[currentIndex].image}
                      alt={testimonials[currentIndex].name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-white/10"
                    />
                    <div>
                      <p className="text-lg leading-relaxed mb-4">
                        “{testimonials[currentIndex].content}”
                      </p>
                      <div>
                        <h4 className="text-xl font-semibold">
                          {testimonials[currentIndex].name}
                        </h4>
                        <p className="text-purple-300">
                          {testimonials[currentIndex].role}, {testimonials[currentIndex].company}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center mt-10 gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    currentIndex === index
                      ? 'w-6 bg-purple-400'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                ></button>
              ))}
            </div>

            {/* Nav Buttons */}
            <button
              onClick={prevTestimonial}
              className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 p-3 rounded-full text-white hidden md:flex"
              aria-label="Previous"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextTestimonial}
              className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 p-3 rounded-full text-white hidden md:flex"
              aria-label="Next"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
