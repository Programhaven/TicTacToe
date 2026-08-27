var builder = WebApplication.CreateBuilder(args);

// 1. Register CORS policy before builder.Build()
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register Game Engine implementation
builder.Services.AddSingleton<TicTacToe.Api.Services.IGameEngine, TicTacToe.Api.Services.GameEngine>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 2. Enable CORS middleware (MUST be placed before app.MapControllers)
app.UseCors("AllowAngular");

app.UseAuthorization();
app.MapControllers();

app.Run();