<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AutenticarApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! $token) {
            return $this->noAutorizado('Tu sesion no esta activa. Inicia sesion nuevamente.');
        }

        $tokenHash = hash('sha256', $token);
        $sesion = DB::table('sesiones_usuario')
            ->join('usuarios', 'usuarios.id', '=', 'sesiones_usuario.usuario_id')
            ->where('sesiones_usuario.token_hash', $tokenHash)
            ->whereNull('sesiones_usuario.revoked_at')
            ->where('sesiones_usuario.expires_at', '>', now())
            ->where('usuarios.activo', true)
            ->select(
                'sesiones_usuario.id as sesion_id',
                'usuarios.id',
                'usuarios.nombre',
                'usuarios.email',
                'usuarios.cargo',
                'usuarios.foto_url',
            )
            ->first();

        if (! $sesion) {
            return $this->noAutorizado('Tu sesion expiro o no es valida. Inicia sesion nuevamente.');
        }

        DB::table('sesiones_usuario')->where('id', $sesion->sesion_id)->update([
            'last_activity_at' => now(),
            'updated_at' => now(),
        ]);

        $request->attributes->set('usuario_autenticado', $sesion);

        return $next($request);
    }

    private function noAutorizado(string $mensaje): JsonResponse
    {
        return response()->json([
            'exito' => false,
            'mensaje' => $mensaje,
            'datos' => null,
            'errores' => [$mensaje],
        ], 401);
    }
}
