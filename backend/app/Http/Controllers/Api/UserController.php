<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * List users, paginated and filterable by role. Admin only.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $users = User::query()
            ->when($request->filled('role'), fn ($query) => $query->where('role', $request->string('role')))
            ->when($request->filled('member'), fn ($query) => $query->where('is_member', $request->boolean('member')))
            ->when($request->filled('search'), fn ($query) => $query->where(fn ($q) => $q
                ->where('name', 'ilike', '%'.$request->string('search').'%')
                ->orWhere('email', 'ilike', '%'.$request->string('search').'%')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));

        return response()->json($users);
    }

    /**
     * Create an organiser/staff/admin account. Admin only.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        return response()->json($user, 201);
    }

    /**
     * Show a single user. Admin, or self.
     */
    public function show(User $user): JsonResponse
    {
        $this->authorize('view', $user);

        return response()->json($user);
    }

    /**
     * Update a user. Admin can change anything; self is limited to
     * name/email/password (role changes are stripped by the request rules).
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $user->update(collect($request->validated())->except('current_password')->all());

        return response()->json($user);
    }

    /**
     * Delete a user. Admin only.
     */
    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        $user->delete();

        return response()->json(null, 204);
    }
}
