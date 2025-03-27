using Microsoft.AspNetCore.Mvc;
using UserManagementApp.Services;
using UserManagementApp.Models;

namespace UserManagementApp.Controllers
{
    public class UsersController(IGoRestService goRestService) : Controller
    {
        private readonly IGoRestService _goRestService = goRestService;

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] PaginationParameters parameters)
        {
            try
            {
                var (users, totalCount) = await _goRestService.GetUsers(parameters.Page, parameters.PerPage);
                return Json(new { 
                    success = true, 
                    data = users,
                    pagination = new {
                        currentPage = parameters.Page,
                        perPage = parameters.PerPage,
                        totalCount = totalCount,
                        totalPages = (int)Math.Ceiling(totalCount / (double)parameters.PerPage)
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    success = false, 
                    message = "Failed to fetch users",
                    error = ex.Message,
                    requestId = HttpContext.TraceIdentifier
                });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetUser(int id)
        {
            try
            {
                var user = await _goRestService.GetUser(id);
                return Json(new { success = true, data = user });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    success = false, 
                    message = "Failed to fetch user",
                    error = ex.Message,
                    requestId = HttpContext.TraceIdentifier
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] User user)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { 
                        success = false, 
                        message = "Invalid user data",
                        errors = ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage))
                    });
                }

                var createdUser = await _goRestService.CreateUser(user);
                return StatusCode(201, new { success = true, data = createdUser });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    success = false, 
                    message = ex.Message,
                    requestId = HttpContext.TraceIdentifier
                });
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] User user)
        {
            try
            {
                var updatedUser = await _goRestService.UpdateUser(id, user);
                return Json(new { success = true, data = updatedUser });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    success = false, 
                    message = "Failed to update user",
                    error = ex.Message,
                    requestId = HttpContext.TraceIdentifier
                });
            }
        }

        [HttpDelete]
        public async Task<IActionResult> DeleteUser(int id)
        {
            try
            {
                await _goRestService.DeleteUser(id);
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    success = false, 
                    message = "Failed to delete user",
                    error = ex.Message,
                    requestId = HttpContext.TraceIdentifier
                });
            }
        }
    }
}
