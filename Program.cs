using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System;
using System.Net.Http.Headers;
using UserManagementApp.Services;

var builder = WebApplication.CreateBuilder(args);

// Add CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("GoRestPolicy",
        policy => policy
            .WithOrigins("https://gorest.co.in")
            .AllowAnyMethod()
            .AllowAnyHeader());
});

builder.Services.AddControllersWithViews()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// Configure HTTP client with default settings
builder.Services.AddHttpClient<IGoRestService, GoRestService>()
    .ConfigureHttpClient(client =>
    {
        var apiToken = builder.Configuration["ApiSettings:GoRestToken"];
        client.BaseAddress = new Uri(builder.Configuration["ApiSettings:GoRestBaseUrl"] ?? "https://gorest.co.in/");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);
        client.Timeout = TimeSpan.FromSeconds(30);
    });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseCors("GoRestPolicy");

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Users}/{action=Index}/{id?}");

app.MapControllerRoute(
    name: "userRoutes",
    pattern: "users/{*anything}",
    defaults: new { controller = "Users", action = "Index" });

app.Run();
