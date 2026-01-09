const Stats = () => {
  const stats = [
    {
      value: '98%',
      suffix: '+',
      label: 'Positive Feedback',
      description: 'Our guests consistently rate their stays as exceptional experiences.',
    },
    {
      value: '15',
      suffix: '+',
      label: 'Years of Expertise',
      description: 'Over a decade of curating luxury travel experiences worldwide.',
    },
    {
      value: '25K',
      suffix: '+',
      label: 'Happy Travelers',
      description: 'Thousands of satisfied guests who trust us with their journeys.',
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container-luxury">
        <div className="text-center mb-12">
          <p className="section-title">By The Numbers</p>
          <h2 className="heading-display text-3xl md:text-4xl">
            Trusted by Travelers Worldwide
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-8 rounded-lg bg-card border border-border hover:shadow-luxury-md transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-baseline justify-center gap-1 mb-4">
                <span className="font-display text-5xl md:text-6xl font-medium text-foreground">
                  {stat.value}
                </span>
                <span className="font-display text-3xl md:text-4xl text-accent font-medium">
                  {stat.suffix}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2">{stat.label}</h3>
              <p className="text-sm text-muted-foreground">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
